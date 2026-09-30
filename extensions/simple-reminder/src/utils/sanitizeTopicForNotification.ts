export const sanitizeTopicForNotification = (topic: string) => {
  return topic.replace(/"/g, '\\"');
};
