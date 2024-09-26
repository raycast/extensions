import { List } from '@raycast/api'
import React from 'react'

const EmptyView = ({type}:{type:string}) => {


  return <List.EmptyView title={'Loading your '+type} 
  icon={{source:"./spinner_pilot.gif"}} />
}

export default EmptyView
