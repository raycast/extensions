export const resolveTimePolicy = (tp: string) => {
  switch (tp) {
    case "WORK": {
      return "Working Hours";
    }
    case "MEETING": {
      return "Meeting Hours";
    }
    case "PERSONAL": {
      return "Personal Hours";
    }
    case "CUSTOM":
    default: {
      return "Custom Hours";
    }
  }
};
