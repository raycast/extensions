export const isValidUrl = (urlString: string) => {
  const urlPattern = new RegExp(/^(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%.]+$/g);
  return !!urlPattern.test(urlString);
};

export const isZoomLink = (urlString: string) => {
  const zoomPattern = new RegExp(/https:\/\/[\w-]*\.?zoom.us\/(j|my)\/[\d\w?=-]+/g);
  return !!zoomPattern.test(urlString);
};

export const isTeamsLink = (urlString: string) => {
  const teamsPattern = new RegExp(/https:\/\/teams.microsoft.com\/l\/meetup-join\/[\d\w?=-]+/g);
  return !!teamsPattern.test(urlString);
};

export const isMeetLink = (urlString: string) => {
  const meetPattern = new RegExp(/https:\/\/meet.google.com\/[\d\w?=-]+/g);
  return !!meetPattern.test(urlString);
};
