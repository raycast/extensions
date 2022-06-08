import { ActionPanel, List, Detail, Action, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from 'react'
// import { getMemberFunctions } from '../api'

export const MemberFunctions = (props: {
    url: string
    setLoading: (loading: boolean) => void
}) => {
  const [memberFunctions, setMemberFunctions]:any = useState([])

  useEffect(() => {
    props.setLoading(false)
  }, [])

  return (
    memberFunctions?.map((memberFunction, index) => (
      <List.Item
        title={memberFunction.title}
        key={index}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Browser" url={memberFunction.url} />
          </ActionPanel>
        }
      />
    ))
  )
}