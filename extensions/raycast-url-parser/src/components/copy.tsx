import { Icon, ActionPanel, Action } from '@raycast/api'

const Copy = (ctx: string) => {
    return <ActionPanel>
        <Action.CopyToClipboard
            title="Copy"
            content={ctx}
            icon={Icon.CopyClipboard}
        />
    </ActionPanel>
}

export default Copy