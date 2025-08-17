export const validateDuration = (newDuration: string | undefined) => {
  if (!newDuration) {
    return "Please enter duration";
  }
  if (
    !newDuration.match(
      /(^ *([1-5]\d|[1-9])m *$)|(^ *\d*[1-9]\d*h *$)|(^ *\d*[1-9]\d*h *[0-5]?\dm *$)|(^ *\d*[1-9]\d*:[0-5]\d *$)|(^ *\d+:([1-5]\d|0[1-9]) *$)|(^ *\d*[1-9]\d*[,.]\d+ *$)|(^ *\d*[,.]\d*[1-9]\d*h? *$)/i,
    )
  ) {
    return "Please enter valid duration";
  }
  return;
};

export const convertDurationsToSeconds = (duration: string) => {
  duration = duration.toLowerCase();
  if (duration.match(/^ *[0-5]?\dm *$/)) {
    return Number(duration.slice(0, duration.length - 1)) * 60;
  } else if (duration.match(/^ *\d+h *$/)) {
    return Number(duration.slice(0, duration.length - 1)) * 60 * 60;
  } else if (duration.match(/^ *\d+h *[0-5]?\dm *$/)) {
    const posH = duration.indexOf("h");
    const posM = duration.indexOf("m");
    const hours = Number(duration.slice(0, posH));
    const minutes = Number(duration.slice(posH + 1, posM));
    return hours * 60 * 60 + minutes * 60;
  } else if (duration.match(/^ *\d+:[0-5]\d *$/)) {
    const [hours, minutes] = duration.split(":").map((value) => Number(value));
    return hours * 60 * 60 + minutes * 60;
  } else if (duration.match(/^ *\d*[,|.]\d+h? *$/)) {
    return Number(duration.replace(",", ".").replace("h", "")) * 60 * 60;
  }
  throw new Error("Invalid duration format");
};
