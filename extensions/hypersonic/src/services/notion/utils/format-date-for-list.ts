export function formatDateForList(dateDue: string): string | null {
	let time_todo = new Date(dateDue)
	let time_todo_locale = new Date(time_todo.getTime() - time_todo.getTimezoneOffset() * 60000)
	//console.log('time_now_iso'+time_now_locale.toISOString())
	if (
	dateDue.indexOf('T') == -1
	) {
	return dateDue
	}
	return time_todo_locale.toISOString().split("T")[0]+" "+time_todo_locale.toLocaleTimeString()
	//.slice(0,5)+" "+time_todo_locale.toLocaleTimeString().slice(10,12)
  }