import { List, Icon, Color } from "@raycast/api";

type Props = {
    error: Error;
    description?: string;
    actions?: React.ReactNode;
};

export default function ErrorView({ error, description, actions }: Props) {
    return (
        <List>
            <List.EmptyView
                icon={{ source: Icon.Warning, tintColor: Color.Red }}
                title={error.message ?? "Failed!"}
                description={description}
                actions={actions}
            ></List.EmptyView>
        </List>
    );
}
