export function createLatestRequestGuard() {
  let latestRequestID = 0;

  return {
    begin() {
      const requestID = ++latestRequestID;
      return () => requestID === latestRequestID;
    },
  };
}
