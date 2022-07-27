import { Component, Fragment } from "react"
import { COPY_SEPARATOR, SECTION_TYPE } from "./consts"
import { Action, ActionPanel, Clipboard, Color, Icon, List, getPreferenceValues, Keyboard } from "@raycast/api"
import { clamp, truncate } from "./utils"

interface ITranslateResult {
    inputState?: string
    translateResultState?: ITranslateReformatResult[]
}

function reformatCopyTextArray(data: string[], limitResultAmount = 10): IReformatTranslateResult[] {
    const dataLength = data?.length - 1
    let finalData: string[] = data
    if (limitResultAmount > 0 && dataLength >= limitResultAmount) {
        finalData = data.slice(0, limitResultAmount - 1)
        finalData.push(data[dataLength])
    }

    return finalData.map((text, idx) => {
        return {
            // title: finalData.length - 1 === idx && idx > 0 ? "All" : truncate(text),
            title: idx === dataLength ? "All" : truncate(text, 40),
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
    copyTextArray.length > 1 && copyTextArray.push(newCopyText)
    const finalTextArray = reformatCopyTextArray(copyTextArray, 6)

    return (
        <ActionPanel.Section>
            {finalTextArray.map((textItem, key) => {
                const title = textItem.title
                const value = textItem.value
                const shortcutKey = clamp(key + 1).toString() as Keyboard.KeyEquivalent
                return (
                    <Action.CopyToClipboard
                        onCopy={() => preferences.isAutomaticPaste && Clipboard.paste(textItem.value)}
                        shortcut={{ modifiers: ["cmd"], key: shortcutKey }}
                        title={`Copy ${title}`}
                        content={value}
                        key={key}
                    />
                )
            })}
        </ActionPanel.Section>
    )
}

class ListActionPanel extends Component<IListItemActionPanelItem> {
    render() {
        return (
            <ActionPanel title={this.props.title}>
                <ActionCopyListSection copyText={this.props.copyText} />
                {this.props.url && (
                    <ActionPanel.Section>
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
                                    subtitle={item?.subtitle}
                                    detail={<List.Item.Detail markdown={item.title} />}
                                    actions={
                                        <ListActionPanel
                                            title={item.subtitle || item.title}
                                            copyText={item?.copyText || item.key || item.subtitle}
                                            url={item.url}
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
