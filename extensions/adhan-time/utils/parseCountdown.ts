export function parseCountdown(countdown: string) {
  let timeLeftInMinutes = 0;

  if (countdown) {
    // Handle both HH:MM:SS and MM:SS formats
    const timeMatch = countdown.match(/\((\d+):(\d+):(\d+)\)|\((\d+):(\d+)\)/);
    let hours = 0, minutes = 0;

    if (timeMatch) {
      if (timeMatch[1]) { // HH:MM:SS format
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
      } else if (timeMatch[4]) { // MM:SS format
        minutes = parseInt(timeMatch[4]);
      }
    }

    timeLeftInMinutes = hours * 60 + minutes;
  }

  return timeLeftInMinutes;
}