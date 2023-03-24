import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, Image, List } from '@raycast/api'
import { getAvatarIcon } from '@raycast/utils'
import { useCallback, useEffect, useState } from 'react'
import { fetchIssuesBy } from '../../apis/jira'
import { JiraDetailField, JiraIssue, JiraPreference, JiraStatus } from '../../apis/types/jira.type'

const getStatusColor = (status: JiraStatus): Color => {
  const statusColorMapping: { [key: string]: Color } = {
    Assign: Color.Blue,
    Backlog: Color.PrimaryText,
    'Dev - To Do': Color.Purple,
    Released: Color.Green,
    'Dev - Done': Color.Yellow,
    'Ready for Deploy': Color.Orange,
    Pending: Color.Red,
    'In UAT': Color.Yellow,
    Testing: Color.SecondaryText
  }
  return statusColorMapping[status.name]
}

const { jiraBaseUrl } = getPreferenceValues<JiraPreference>()
const jiraBoardBrowserUrl = jiraBaseUrl + 'browse/'

export function JiraCommand() {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const fetchIssues = useCallback((searchText: string) => {
    setIsLoading(true)
    fetchIssuesBy(searchText)
      .then((jiraIssues) => {
        setIssues(jiraIssues?.issues || [])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => fetchIssues(''), [])

  const Actions = (props: { issueKey: string; link: string; jiraIssue: JiraIssue }) => {
    return (
      <ActionPanel title={props.issueKey}>
        <Action.Push title="Detail" target={<IssueDetail jiraIssue={props.jiraIssue} link={props.link} />} />
        <Action.OpenInBrowser url={props.link} />
      </ActionPanel>
    )
  }

  const parseImageLink = (description: string, attachmentPool: { [p: string]: string }) => {
    const regex = /![\w-]+\.(png|jpg|jpeg|gif)!/gi
    return description.replace(regex, (imgUrl) => {
      const pureImgName = imgUrl.slice(1, -1)
      return `[点击查看图片](${attachmentPool[pureImgName]})`
    })
  }

  const IssueDetail = (props: { jiraIssue: JiraIssue; link: string }) => {
    const detailField = props.jiraIssue.fields
    console.log(detailField.creator, detailField.assignee)
    const attachmentPool: { [p: string]: string } = Object.fromEntries(
      detailField.attachment?.map(({ filename, content }) => [filename, content])
    )
    let description = detailField.description
    description = parseImageLink(description, attachmentPool)
    description = description.replaceAll('{}', '').replaceAll('{*}', '')

    const markdown = `## ${detailField.summary}\n\n---\n${description}`

    return (
      <Detail
        markdown={markdown}
        navigationTitle={detailField.summary}
        actions={
          <ActionPanel title={props.jiraIssue.key}>
            <Action.OpenInBrowser url={props.link} />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Issue Key" icon={detailField.issuetype.iconUrl} text={props.jiraIssue.key} />
            <Detail.Metadata.Label title="Project" text={detailField.project.name} />
            <Detail.Metadata.Label
              title="Status"
              text={{
                value: detailField.status.name,
                color: Color.SecondaryText
              }}
            />
            <Detail.Metadata.Label
              title="Priority"
              icon={detailField.priority.iconUrl}
              text={detailField.priority.name}
            />
            <Detail.Metadata.Label
              title="Assignee"
              icon={
                detailField.assignee
                  ? detailField.assignee?.avatarUrls['24x24'] || getAvatarIcon(detailField.assignee.displayName)
                  : Icon.Person
              }
              text={detailField.assignee?.displayName || 'Unassigned'}
            />
            <Detail.Metadata.Label
              title="Reporter"
              icon={detailField.creator?.avatarUrls['24x24'] || getAvatarIcon(detailField.creator.displayName)}
              text={detailField.creator.displayName}
            />
            <Detail.Metadata.TagList title="Labels">
              {detailField.labels?.length > 0 ? (
                detailField.labels.map((label) => {
                  return <Detail.Metadata.TagList.Item text={label} color={'#eed535'} />
                })
              ) : (
                <Detail.Metadata.TagList.Item text="None" />
              )}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
      />
    )
  }

  const IssueItem = (props: { jiraIssue: JiraIssue }) => {
    const jiraDetailField: JiraDetailField = props.jiraIssue.fields
    const issueKey = props.jiraIssue.key
    return (
      <List.Item
        icon={{
          source: jiraDetailField.issuetype.iconUrl,
          mask: Image.Mask.RoundedRectangle
        }}
        title={jiraDetailField.summary ?? 'No title'}
        accessories={[
          {
            text: {
              value: jiraDetailField.status.name,
              color: getStatusColor(jiraDetailField.status)
            }
          },
          {
            text: {
              value: props.jiraIssue.key,
              color: Color.SecondaryText
            }
          },
          {
            icon: {
              source: jiraDetailField.priority.iconUrl
            }
          }
        ]}
        actions={<Actions issueKey={issueKey} link={`${jiraBoardBrowserUrl}${issueKey}`} jiraIssue={props.jiraIssue} />}
      />
    )
  }

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      navigationTitle={`Find ${issues?.length || 0} Issues`}
      searchBarPlaceholder={'请输入JIRA卡号 or 任何关键字'}
      onSearchTextChange={(text) => {
        fetchIssues(text)
      }}
    >
      {!issues || issues.length === 0 ? (
        <List.EmptyView title="No issues were found to match your search" />
      ) : (
        issues?.map((issue, index) => <IssueItem key={index} jiraIssue={issue} />)
      )}
    </List>
  )
}
