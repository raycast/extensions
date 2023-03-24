import { getPreferenceValues } from '@raycast/api'
import { getBearerTokenHeader } from '../utils'
import { initHttpClient } from '../utils/httpClient'
import { JiraIssues, JiraPreference } from './types/jira.type'

const { jiraToken, jiraBaseUrl } = getPreferenceValues<JiraPreference>()
const httpClient = initHttpClient({
  baseURL: jiraBaseUrl,
  headers: getBearerTokenHeader(jiraToken)
})

const isJiraKey = (text: string) => {
  return /^[A-Z]+-\d+$/.test(text)
}

const fetchIssuesBy = (searchText: string, startIndex = 0): Promise<JiraIssues | void> => {
  let jql = !searchText
    ? 'reporter+%3D+currentUser()+order+by+created+DESC'
    : `text ~ "${searchText}" order by lastViewed DESC`

  if (isJiraKey(searchText)) {
    jql = `text ~ "${searchText}" OR key = "${searchText}" order by lastViewed DESC`
  }

  return httpClient
    .get<JiraIssues>(
      `/rest/api/2/search?fields=summary,assignee,issuetype,labels,status,priority,description,project,created,creator,attachment&startIndex=${startIndex}&jql=${jql}`
    )
    .then((res) => {
      return res.data
    })
    .catch((e) => {
      console.log('search jira issue error message:', e.message)
    })
}

export { fetchIssuesBy }
