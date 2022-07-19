import { getPreferenceValues } from '@raycast/api'

export function getDateOverdue(dateDue: string): boolean {
	const preferences = getPreferenceValues()
	var time_now = new Date()
	var time_now_locale = new Date(time_now.getTime() - time_now.getTimezoneOffset() * 60000)
	//console.log('time_now_iso'+time_now_locale.toISOString())
	var isOverdueVal = false
	  if (
		dateDue.indexOf(':') == -1
	  ) {
		isOverdueVal = time_now_locale.toISOString().split("T")[0]>dateDue
	  }
	  else
	  {
		isOverdueVal = time_now_locale.toISOString().split(".")[0]>dateDue.split(".")[0]
	  }
	return isOverdueVal
  }