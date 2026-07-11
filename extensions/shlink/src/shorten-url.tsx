import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showHUD, showToast } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { apiClient } from "./api/shlinkClient";
import { formatISO } from "date-fns"; // The default .toISOString() format is not compatible with the API
import isUrl from "is-url";

type Values = {
    title?: string;
    tags: string[];
    customTags?: string;
    longUrl: string;
    customSlug?: string;
    shortCodeLength: string;
    maxVisits?: string;
    validSince?: Date;
    validUntil?: Date;
    crawlable: boolean;
    forwardQuery: boolean;
    domain: string;
};

export default function Command() {
    const { isLoading: isDomainsLoading, data: domainsData } = usePromise(async () => {
        const res = await apiClient.listDomains();

        return res.data;
    });

    const { isLoading: isTagsLoading, data: tagsData } = usePromise(async () => {
        const res = await apiClient.listTags();

        return res.data;
    });

    const [useCustomTags, setUseCustomTags] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const { handleSubmit, itemProps, setValue } = useForm<Values>({
        onSubmit: async (values) => {
            try {
                setIsLoading(true);
                const res = await apiClient.createShortUrl({
                    ...values,
                    maxVisits: values.maxVisits ? parseInt(values.maxVisits) : undefined,
                    shortCodeLength: parseInt(values.shortCodeLength),
                    validSince: values.validSince ? formatISO(values.validSince) : undefined,
                    validUntil: values.validUntil ? formatISO(values.validUntil) : undefined,
                    tags: useCustomTags ? values.customTags?.split(",") : values.tags,
                });

                await Clipboard.copy(res.shortUrl);

                showHUD("✅ Shortened URL copied to the clipboard");
            } catch (e) {
                showToast({
                    title: "Failed to shorten URL",
                    message: e.message,
                    style: Toast.Style.Failure,
                });
            } finally {
                setIsLoading(false);
            }
        },
        initialValues: {
            longUrl: "",
            domain: "",
            customSlug: null,
            shortCodeLength: null,
            maxVisits: null,
            validSince: null,
            validUntil: null,
            crawlable: false,
            forwardQuery: true,
            tags: [],
            customTags: "",
        },
        validation: {
            longUrl: (value) => {
                if (!isUrl(value)) {
                    return "Invalid URL";
                }
            },
            domain: FormValidation.Required,
            shortCodeLength: (value) => {
                if (value) {
                    if (isNaN(parseInt(value))) {
                        return "Invalid number";
                    }

                    if (parseInt(value) < 4) {
                        return "Short code length must be between more than 4";
                    }
                }
            },
            maxVisits: (value) => {
                if (value) {
                    if (isNaN(parseInt(value))) {
                        return "Invalid number";
                    }

                    if (parseInt(value) < 1) {
                        return "Max visits must be greater than 0";
                    }
                }
            },
        },
    });

    useEffect(() => {
        (async () => {
            const { text } = await Clipboard.read();

            setValue("longUrl", isUrl(text) ? text : "");
        })();
    }, []);

    useEffect(() => {
        if (domainsData) {
            setValue("domain", domainsData?.find((domain) => domain.isDefault).domain);
        }
    }, [domainsData]);

    return (
        <Form
            searchBarAccessory={<Form.LinkAccessory text="Web Dashboard" target="https://app.shlink.io/" />}
            isLoading={isDomainsLoading || isTagsLoading || isLoading}
            actions={
                <ActionPanel>
                    <Action.SubmitForm icon={Icon.CopyClipboard} title="Submit and Copy" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField title="Long URL" storeValue={false} autoFocus {...itemProps.longUrl} />
            <Form.Separator />
            <Form.TextField
                title="Title"
                info="Descriptive title for the shortened link"
                placeholder="(Optional)"
                {...itemProps.title}
            />
            {useCustomTags ? (
                <>
                    <Form.TextField
                        title="Custom Tags"
                        info="Comma separated list of custom tags"
                        placeholder="(Optional)"
                        storeValue={false}
                        id={itemProps.customTags.id}
                        value={itemProps.customTags.value}
                        onChange={(value) => setValue("customTags", value.replace(" ", "-"))}
                    />
                </>
            ) : (
                <Form.TagPicker
                    title="Tags"
                    info="List of pre-existing tags"
                    placeholder="(Optional)"
                    storeValue={false}
                    {...itemProps.tags}
                >
                    {tagsData?.map((tag) => <Form.TagPicker.Item title={tag} key={tag} value={tag} />)}
                </Form.TagPicker>
            )}
            <Form.Checkbox
                title="Tags Input Mode"
                label="Set custom tags instead of selecting from the list"
                storeValue={false}
                id="useCustomTags"
                value={useCustomTags}
                onChange={setUseCustomTags}
            />
            <Form.Separator />
            <Form.Dropdown title="Domain" info="The domain for the shortened url" storeValue {...itemProps.domain}>
                {domainsData?.map((domain) => (
                    <Form.Dropdown.Item title={domain.domain} key={domain.domain} value={domain.domain} />
                ))}
            </Form.Dropdown>
            <Form.TextField
                title="Custom Slug"
                placeholder="(Optional)"
                info="The slug to be used instead of the short code"
                {...itemProps.customSlug}
            />
            <Form.TextField
                title="Short Code Length"
                placeholder="(Default: 5)"
                info="The lenght of the generated short code"
                storeValue
                {...itemProps.shortCodeLength}
            />
            <Form.Separator />
            <Form.TextField
                title="Max Visits"
                info="The maximum number of allowed visits"
                placeholder="(Optional)"
                {...itemProps.maxVisits}
            />
            <Form.DatePicker title="Valid Since" {...itemProps.validSince} />
            <Form.DatePicker title="Valid Until" {...itemProps.validUntil} />
            <Form.Separator />
            <Form.Checkbox
                title="Crawlable"
                label="Should the URL be included in robots.txt ...?"
                storeValue
                {...itemProps.crawlable}
            />
            <Form.Checkbox
                title="Forward Query Params"
                label="Should the query params be appended to the original URL ...?"
                storeValue
                {...itemProps.forwardQuery}
            />
        </Form>
    );
}
