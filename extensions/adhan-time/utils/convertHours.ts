export function convertHours(time: string) {
    const hours = time.split(':')[0];
    const minutes = time.split(':')[1];
    if (parseInt(hours) > 12)
      return `${parseInt(hours) - 12}:${minutes} pm`
    else
      return `${hours}:${minutes} am`
  }