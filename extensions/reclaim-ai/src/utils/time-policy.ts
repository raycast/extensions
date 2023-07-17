export const resolveTimePolicy = (tp: string) => {
  switch (tp) {
    case "WORK": {
      return "Working hours";
    }
    case "MEETING": {
      return "Meeting hours";
    }
    case "PERSONAL": {
      return "Personal hours";
    }
    case "CUSTOM":
    default: {
      return "Custom hours";
    }
  }
};
