import { ActionPanel, Action, List, showToast, Toast, Icon, Image } from "@raycast/api";
import { useState } from "react";
import { ContactFragment, ServiceFragment, ServiceToolFragment } from "./client";
import { LaunchProps } from "@raycast/api";
import OpenRepoInEditorAction from "./clone-action";
import { useCachedPromise } from "@raycast/utils";
import ToolsSection from "./tools-section";
import ContactSection from "./contact-section";
import { useVisitedServices } from "./useVisitedServices";
import { fetchServices } from "./client";

export default function Command(props: LaunchProps<{ arguments: { service: string } }>) {
    const [searchText, setSearchText] = useState(props.arguments?.service ?? "");
    const { isLoading, error, data } = useCachedPromise(fetchServices, [], {
        keepPreviousData: true,
    });

    const { services: visitedServices, visitService, isLoading: isLoadingVisistedServices } = useVisitedServices();

    if (error) {
        showToast({
            style: Toast.Style.Failure,
            title: "Failed searching services",
            message: error instanceof Error ? error.message : String(error),
        });
    }

    return (
        <List
            isLoading={isLoading || isLoadingVisistedServices}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            filtering={true}
            searchBarPlaceholder="Search services..."
        >
            <List.Section title="Previously visited" subtitle={visitedServices?.length + ""}>
                {visitedServices?.map((service) => (
                    <SearchListItem key={service?.id} service={service} onVisisted={visitService} />
                ))}
            </List.Section>
            <List.Section title="Results" subtitle={data?.length + ""}>
                {data?.map((service) => (
                    <SearchListItem key={service?.id} service={service} onVisisted={visitService} />
                ))}
            </List.Section>
        </List>
    );
}

function SearchListItem({
    service,
    onVisisted,
}: {
    service: ServiceFragment;
    onVisisted: (service: ServiceFragment) => void;
}) {
    const accessories: List.Item.Accessory[] = [];

    if (service.onCalls?.nodes?.length) {
        accessories.push({
            icon: {
                source: service.onCalls?.nodes[0]?.gravatarHref ?? "",
                fallback: Icon.PhoneRinging,
                mask: Image.Mask.Circle,
            },
            tooltip: "On call",
            text: service.onCalls?.nodes[0]?.name,
        });
    }

    const firstRepo = service.defaultServiceRepository?.repository.url;
    const visit = () => onVisisted(service);
    const contacts = service.owner?.contacts as ContactFragment[];
    const tools = service.tools?.nodes as ServiceToolFragment[];

    return (
        <List.Item
            title={service.name}
            subtitle={service?.description ?? ""}
            accessories={accessories}
            keywords={[
                service.name,
                service.description ?? "",
                service.note ?? "",
                ...service.aliases,
                ...(service.tags?.nodes?.map((tag) => tag?.key ?? "") ?? []),
                ...(service.tags?.nodes?.map((tag) => tag?.value ?? "") ?? []),
            ].filter((k) => !!k)}
            actions={
                <ActionPanel>
                    <ActionPanel.Section>
                        <Action.OpenInBrowser
                            title="Open On OpsLevel"
                            url={service.htmlUrl}
                            icon={{ source: "opslevel.svg" }}
                            onOpen={visit}
                        />
                        {firstRepo && (
                            <Action.OpenInBrowser
                                title="Open On Github"
                                url={firstRepo}
                                icon={{ source: "github-mark-white.svg" }}
                                shortcut={{ modifiers: ["cmd"], key: "g" }}
                                onOpen={visit}
                            />
                        )}
                        {firstRepo?.includes("github.com") && (
                            <Action.OpenInBrowser
                                title="Open Pull Requests"
                                url={`${firstRepo.replace(".git", "")}/pulls`}
                                icon={{ source: "github-mark-white.svg" }}
                                shortcut={{ modifiers: ["cmd"], key: "p" }}
                                onOpen={visit}
                            />
                        )}
                    </ActionPanel.Section>
                    <OpenRepoInEditorAction repoUrl={firstRepo} onVisisted={visit} />
                    <ContactSection contacts={contacts} onVisisted={visit} />
                    <ToolsSection tools={tools} onVisisted={visit} />
                </ActionPanel>
            }
        />
    );
}
