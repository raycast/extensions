import { Action, ActionPanel, Alert, Color, Form, Grid, Icon, List, confirmAlert } from "@raycast/api";
import { umami } from "./lib/umami";
import useUmami from "./lib/useUmami";
import { AddWebsiteFormValues, UmamiWebsite } from "./lib/types";
import { FormValidation, getFavicon, useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";
import WithUmami from "./components/WithUmami";
import { UmamiApiClient } from "@umami/api-client";

export default function Main() {
return <WithUmami>
        <Websites />
    </WithUmami>
}

function Websites() {
    const { isLoading, data: websites = [] } = useCachedPromise(async () => {
        const {ok,error, data} = await umami.getWebsites();
        if (!ok) throw new Error(error);
        return data?.data;
    })

    const [del, setDel] = useState("");
    const { isLoading: isDeleting, data: deleteData, revalidate: deleteWebsite } = useUmami(umami.deleteWebsite(del), { execute: false })

    // async function confirmAndDelete(website: UmamiWebsite) {
    //     const options: Alert.Options = {
    //         icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
    //         title: `Delete ${website.name}?`,
    //         message: `All website data will be deleted.`,
    //         primaryAction: {
    //             title: 'Delete',
    //             style: Alert.ActionStyle.Destructive,
    //             onAction: async () => {
    //                 setDel(website.id);
    //                 await deleteWebsite();
    //                 // try {
    //                 //     setIsDeleting(true);
    //                 //     await showToast({
    //                 //     title: `Deleting ${record.type} record`,
    //                 //     style: Toast.Style.Animated,
    //                 //     });
    //                 //     await api.deleteDNSRecord(domain.id, record.id);
    //                 //     await showToast({
    //                 //     title: `Deleted ${record.type} record`,
    //                 //     });
    //                 //     revalidate();
    //                 // } catch (e) {
    //                 //     handleNetworkError(e);
    //                 // } finally {
    //                 //     setIsDeleting(false);
    //                 // }
    //             },
    //         },
    //     };
    //     await confirmAlert(options);
    // }

    return <List isLoading={isLoading}>
        {websites && !websites.length && <List.EmptyView title="Add your website to get started." icon="placeholder.png" actions={<ActionPanel>
            <Action.Push title="Add Website" icon={Icon.Plus} target={<AddWebsite />} />
        </ActionPanel>} />}
        {websites.map(website => <List.Item key={website.id} icon={getFavicon(`https://${website.domain}`)} title={website.name} subtitle={website.domain} accessories={[
            // { date: website.updatedAt ? new Date(website.updatedAt) : undefined }
        ]} actions={<ActionPanel>
            <Action.Push icon={Icon.ArrowRight} title="View Details" target={<WebsiteDetails website={website} />} />
            {/* <Action title="Delete Website" icon={Icon.DeleteDocument} style={Action.Style.Destructive} onAction={() => confirmAndDelete(website)} /> */}
            <Action.Push title="Add Website" icon={Icon.Plus} target={<AddWebsite />} />
        </ActionPanel>} />)}
    </List>
}

function WebsiteDetails({website}: {website: UmamiWebsite}) {
    const {isLoading, data: stats} = useCachedPromise(async() => {
        const endAt = Date.now();
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
        const startAt = pastDate.getTime();

        const {ok,error, data} = await umami.getWebsiteStats(website.id, { startAt, endAt });
        if (!ok) throw new Error(error);
        return data;
    })
    return <Grid isLoading={isLoading}>
        <Grid.Item title={stats?.pageviews.value.toString()} subtitle="Views" content={Color.Red} />
    </Grid>
}

function AddWebsite() {
    const { itemProps, handleSubmit, values } = useForm<AddWebsiteFormValues>({
        async onSubmit() {
            await createWebsite();
            console.log('okasa');
        },
        validation: {
            domain: FormValidation.Required,
            name: FormValidation.Required
        }
    })

    const { isLoading, data, revalidate: createWebsite } = useUmami(umami.createWebsite(values), { execute: false })

    return <Form navigationTitle="Add Website" isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="Domain" placeholder="https://example.com" info="The full domain of the tracked website" {...itemProps.domain} />
        <Form.TextField title="Name" placeholder="Example Website" info="The name of the website in Umami" {...itemProps.name} />
        {/* <Form.TextField title="Share ID" info="A unique string to enable a share url. Set null to unshare" {...itemProps.shareId} />
        <Form.TextField title="Team ID" info="The ID of the team the website will be created under" {...itemProps.teamId} /> */}
    </Form>
}