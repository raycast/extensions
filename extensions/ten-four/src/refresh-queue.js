function createRefreshQueue(load) {
  let inflight = null;
  let followUpQueued = false;

  return function refresh({ followUp = false } = {}) {
    if (inflight) {
      followUpQueued ||= followUp;
      return inflight;
    }

    inflight = (async () => {
      do {
        followUpQueued = false;
        await load();
      } while (followUpQueued);
    })().finally(() => {
      inflight = null;
    });

    return inflight;
  };
}

module.exports = { createRefreshQueue };
