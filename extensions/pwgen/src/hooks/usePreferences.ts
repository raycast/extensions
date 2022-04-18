import { getPreferenceValues } from '@raycast/api'

export type Preferences = {
	strength: string
	length: string
	delimiter: string
	maxWordLength: string
}

const usePreferences = (): Preferences => getPreferenceValues()

export default usePreferences
