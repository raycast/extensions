import { ActionPanel, List, Action, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from 'react'
import { Documentation } from './Documentation'
import { MemberFunctions } from './MemberFunctions'

export const Main = (props: {
  url: string
}) => {
  const [state, setState]:any = useState(1)
  const [docLoading, setDocLoading] = useState(true)
  const [funcLoading, setFuncLoading] = useState(true)

  return (
    <List 
      isShowingDetail={state === 2}
      searchBarAccessory={
        <List.Dropdown 
          tooltip="See Documentation"
          storeValue={true}
          onChange={(state) => {
            setState(parseInt(state))
          }}
        >
          <List.Dropdown.Item title="See Full Documentation" value="1" />
          <List.Dropdown.Item title="See Member Functions" value="2" />
        </List.Dropdown>
      }
      isLoading={state === 1 ? docLoading : funcLoading}
    >
      {
        state === 1 ? <Documentation url={props.url} setLoading={setDocLoading}/> :
        state === 2 ? <MemberFunctions url={props.url} setLoading={setFuncLoading}/> : 
        undefined
      }
    </List>
  )
}