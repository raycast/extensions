import { Action, Icon } from "@raycast/api"

export default function ActionFeedback() {
    return (
        <Action.OpenInBrowser
            icon={Icon.QuestionMark}
            title="Feedback"
            url="https://github.com/Haojen/raycast-Parrot"
        />
    )
}
