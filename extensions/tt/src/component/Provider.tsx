import { FunctionComponent } from 'react'
import { getPreferenceValues } from '@raycast/api'
import {
  Preference,
  PreferenceContext,
} from '../context/PreferenceContext'

export const Provider: FunctionComponent = (props) => {
  const preferenceValues = getPreferenceValues<Preference>()

  return (
    <PreferenceContext.Provider value={preferenceValues}>
      {props.children}
    </PreferenceContext.Provider>
  )
}
