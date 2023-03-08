import { Action, ActionPanel, Color, Icon, List } from "@raycast/api"

const icon = { source: Icon.XmarkCircle, tintColor: Color.Red }

interface ITranslateError {
    errorCode: string
}
export function TranslateError(props: ITranslateError) {
    return (
        <List.Item
            icon={icon}
            title={`Sorry! We have some problems..`}
            subtitle={`code: ${props.errorCode}`}
            actions={
                <ActionPanel>
                    <Action.OpenInBrowser
                        title="Help"
                        icon={Icon.QuestionMark}
                        url="https://github.com/Haojen/raycast-Parrot#error-code-information"
                    />
                </ActionPanel>
            }
        />
    )
}

export function LanguageConflict() {
    return (
        <List>
            <List.Item
                icon={icon}
                title={"Language Conflict"}
                subtitle={"Your first Language with second Language must be different."}
            />
        </List>
    )
}
