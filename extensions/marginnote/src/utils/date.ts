export function getRealUTCDate(num: number) {
  return new Date((num + 978307200) * 1000)
}

export function getLocalDate(date: Date) {
  return new Date(date.getTime() - new Date().getTimezoneOffset() * 60 * 1000)
}

export function getLocalDateFromDB(num: number) {
  return new Date(
    (num + 978307200) * 1000 - new Date().getTimezoneOffset() * 60 * 1000
  )
}

export function dateFormat(date: Date, fmt = "YYYY-mm-dd HH:MM") {
  let ret
  const opt = {
    "Y+": date.getFullYear().toString(),
    "m+": (date.getMonth() + 1).toString(),
    "d+": date.getDate().toString(),
    "H+": date.getHours().toString(),
    "M+": date.getMinutes().toString(),
    "S+": date.getSeconds().toString() // second
  }
  Object.entries(opt).forEach(([k, v]) => {
    ret = new RegExp("(" + k + ")").exec(fmt)
    if (ret) {
      fmt = fmt.replace(
        ret[1],
        ret[1].length == 1 ? v : v.padStart(ret[1].length, "0")
      )
    }
  })
  return fmt
}
