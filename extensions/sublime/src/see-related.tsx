import { authService } from "./utils/auth";
import { withAccessToken } from "@raycast/utils";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { isURL } from "./utils/url";
import { useEffect, useState } from "react";
import { useCardsSearch } from "./hooks/search";
import CardsList from "./views/list";
import { fetchRelatedCards, previewLink } from "./utils/api";
import { useActiveTab } from "./utils/use-active-tab";

function SeeRelatedCards() {
    const [link, setLink] = useState<string>("");
    const [text, setText] = useState<string>("");

    const linkError = link && !isURL(link) ? "Please enter a valid link" : undefined;
    const missingData = !link && !text;
    const tooMuchData = link && text;
    function onSubmitInvalidData() {
        showToast({
            style: Toast.Style.Failure,
            title: "Please enter either a link or text",
        });
    }

    // Set values automatically based on context
    const activeTab = useActiveTab();
    useEffect(() => {
        if (activeTab && !link && !text) {
            setLink(activeTab.url);
        }
    }, [activeTab]);
    useEffect(() => {
        Clipboard.read().then(({ text: pastedText }) => {
            if (!text && !link && isURL(pastedText)) {
                setLink(pastedText);
            }
        });
    }, []);

    return (
        <Form
            actions={
                <ActionPanel>
                    {linkError || missingData || tooMuchData ? (
                        <Action.SubmitForm title="Show Related Cards" onSubmit={onSubmitInvalidData} />
                    ) : (
                        <Action.Push title="Show Related Cards" target={<RelatedCardsList link={link} text={text} />} />
                    )}
                </ActionPanel>
            }
        >
            <Form.TextField
                id="link"
                title="Link"
                placeholder="Paste link"
                value={link}
                onChange={setLink}
                error={linkError}
            />
            <Form.Description title="Or" text="" />
            <Form.TextArea id="text" title="Text" placeholder="Type here" value={text} onChange={setText} />
        </Form>
    );
}

function RelatedCardsList({ link, text }: { link?: string; text?: string }) {
    const { cards, isLoading, pagination } = useCardsSearch(
        "",
        true,
        async (query, restrictToLibrary, page) => {
            if (link) {
                const pageInfo = await previewLink(link);
                if (pageInfo.uuid) {
                    return await fetchRelatedCards(pageInfo.uuid, undefined, page);
                }

                // If link not saved yet, search by its title
                const pageDescription = `${pageInfo.name}\n${pageInfo.description}`.trim();
                return await fetchRelatedCards(undefined, pageDescription, page);
            } else {
                return await fetchRelatedCards(undefined, text, page);
            }
        },
        true,
    );

    return (
        <CardsList
            searchBarPlaceholder="Browse related cards"
            cards={cards}
            isLoading={isLoading}
            pagination={pagination}
        />
    );
}

export default withAccessToken(authService)(SeeRelatedCards);
