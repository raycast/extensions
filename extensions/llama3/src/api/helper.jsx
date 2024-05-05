export const formatDate = (dateToCheckISO) => {
  // Calculate the date difference between the current date and the date to check
  // and format it like: 2y, 3mo, 4d, 5h, 6m (no seconds because updates will be too frequent)

  const d1 = new Date(),
    t1 = d1.getTime();
  const d2 = new Date(dateToCheckISO),
    t2 = d2.getTime();
  const diff = t1 - t2;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  let formatted = "now";
  // we only want one unit of time, and it should be the largest unit
  for (const [unit, value] of [
    ["y", years],
    ["mo", months],
    ["d", days],
    ["h", hours],
    ["m", minutes],
  ]) {
    if (value > 0) {
      formatted = `${value}${unit}`;
      break;
    }
  }

  return formatted;
};

// Format a series of messages into a single string
export const formatChatToPrompt = (chat) => {
  let prompt = "";
  for (let i = 0; i < chat.length; i++) {
    prompt += chat[i].role + ": " + chat[i].content + "\n";
  }
  prompt += "assistant:";
  return prompt;
};
