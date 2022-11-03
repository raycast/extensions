import { Component, Fragment } from "react"
import { COPY_SEPARATOR, SECTION_TYPE } from "./consts"
import { Action, ActionPanel, Clipboard, Color, Icon, List, getPreferenceValues, Keyboard, Detail } from "@raycast/api"
import { clamp, truncate } from "./utils"

interface ITranslateResult {
    inputState?: string
    translateResultState?: ITranslateReformatResult[]
}

function reformatCopyTextArray(data: string[], limitResultAmount = 10): IReformatTranslateResult[] {
    const dataLength = data?.length - 1
    let finalData: string[] = data
    if (limitResultAmount > 0 && dataLength >= limitResultAmount) {
        finalData = data.slice(0, limitResultAmount)
    }

    return finalData.map((text) => {
        return {
            title: truncate(text, 40),
            value: text,
        }
    })
}

const preferences: IPreferences = getPreferenceValues()

function ActionCopyListSection(props: IActionCopyListSection) {
    if (!props.copyText) {
        return null
    }

    const copyTextArray = props.copyText.split(COPY_SEPARATOR)
    const newCopyText = copyTextArray.join(" ")
    copyTextArray.length > 1 && copyTextArray.unshift(newCopyText)
    const finalTextArray = reformatCopyTextArray(copyTextArray, 6)

    return (
        <ActionPanel.Section>
            {finalTextArray.map((textItem, key) => {
                const title = textItem.title
                const value = textItem.value
                const shortcutKey = clamp(key).toString() as Keyboard.KeyEquivalent
                return (
                    <Action.CopyToClipboard
                        onCopy={() => preferences.isAutomaticPaste && Clipboard.paste(textItem.value)}
                        shortcut={{ modifiers: ["ctrl"], key: shortcutKey }}
                        title={`Copy ${title}`}
                        content={value}
                        key={key}
                    />
                )
            })}
        </ActionPanel.Section>
    )
}

function EmojiAllDescription(props: EmojiAllDetail) {
    const markdown = `# ${props.title}\r${props.details}`
    return (
        <Detail
            markdown={markdown}
            navigationTitle={props.title}
            metadata={
                <Detail.Metadata>
                    <Detail.Metadata.Link title="Basic" target={props.url} text="Detail Page" />
                    <Detail.Metadata.Link title="Advanced Usage" target={props.codeUrl} text="Unicode Information" />
                </Detail.Metadata>
            }
            actions={
                <ActionPanel>
                    <ActionCopyListSection copyText={props.copyText} />
                    <Action.OpenInBrowser url={props.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
                </ActionPanel>
            }
        />
    )
}

class ListActionPanel extends Component<IListItemActionPanelItem> {
    render() {
        return (
            <ActionPanel title={this.props.title}>
                <ActionCopyListSection copyText={this.props.copyText} />
                {this.props.url && this.props.codeUrl && (
                    <ActionPanel.Section title="EmojiAll">
                        <Action.Push
                            icon={Icon.Document}
                            title="View Description"
                            shortcut={{ modifiers: ["cmd"], key: "enter" }}
                            target={
                                <EmojiAllDescription
                                    title={this.props.title}
                                    details={this.props.details}
                                    url={this.props.url}
                                    codeUrl={this.props.codeUrl}
                                    copyText={this.props.copyText}
                                />
                            }
                        />
                        <Action.OpenInBrowser url={this.props.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
                    </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Others">
                    <Action.OpenInBrowser
                        icon={Icon.QuestionMark}
                        title="Feedback"
                        url="https://github.com/Hydrapse/raycast-DLmoji"
                    />
                </ActionPanel.Section>
            </ActionPanel>
        )
    }
}

export default function TranslateResult(props: ITranslateResult) {
    return (
        <Fragment>
            {props.translateResultState?.map((result, idx) => {
                const iconMaps = {
                    [SECTION_TYPE.Translate]: {
                        source: Icon.Dot,
                        tintColor: Color.Blue,
                    },
                    [SECTION_TYPE.Emoji]: {
                        source: Icon.Dot,
                        tintColor: Color.Green,
                    },
                    [SECTION_TYPE.Phrase]: {
                        source: Icon.Dot,
                        tintColor: Color.Brown,
                    },
                }
                return (
                    <List.Section key={idx} title={result.title}>
                        {result.children?.map((item) => {
                            return (
                                <List.Item
                                    key={item.key}
                                    icon={iconMaps[result.type!]}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    detail={<List.Item.Detail markdown={item.title} />}
                                    actions={
                                        <ListActionPanel
                                            title={item.fullTitle || item.title}
                                            details={item.description}
                                            copyText={item.copyText}
                                            url={item.url}
                                            codeUrl={item.codeUrl}
                                        />
                                    }
                                />
                            )
                        })}
                    </List.Section>
                )
            })}
        </Fragment>
    )
}
