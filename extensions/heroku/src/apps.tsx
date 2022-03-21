import { List } from "@raycast/api";
import useSWR from 'swr'
import heroku from './heroku'

export default function Command() {
  const { data, error } = useSWR('apps', () => heroku.requests.getApps({}).then(res => {
    if (res.hasFailed) {
      throw res.error
    } else {
      return res.data
    }
  }))

  if (!data) {
    return <List isLoading />
  }
  
  return <List>
    {data.map(app => <List.Item 
      title={app.name}
      key={app.id}
    />)}
  </List>
}
