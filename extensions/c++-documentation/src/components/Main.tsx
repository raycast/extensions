import { ActionPanel, List, Action, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from 'react'
import { Documentation } from './Documentation'
import { MemberFunctions } from './MemberFunctions'

export const Main = (props: {
  url: string
}) => {
  const [state, setState]:any = useState(1)
  const [loading, setLoading] = useState(true)

  return (
    <List 
      isShowingDetail={state === 2}
      searchBarAccessory={
        <List.Dropdown 
          tooltip="See Documentation"
          storeValue={true}
          onChange={(state) => {
            setState(parseInt(state))
            setLoading(true)
          }}
        >
          <List.Dropdown.Item title="See Full Documentation" value="1" />
          <List.Dropdown.Item title="See Member Functions" value="2" />
        </List.Dropdown>
      }
      isLoading={loading}
    >
      {
        state === 1 ? <Documentation url={props.url} setLoading={setLoading}/> :
        state === 2 ? <MemberFunctions url={props.url} setLoading={setLoading}/> : 
        undefined
      }
    </List>
  )
}