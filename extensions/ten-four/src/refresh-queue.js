function createRefreshQueue(load) {
  let inflight = null;
  let followUpQueued = false;

  return function refresh({ followUp = false } = {}) {
    if (inflight) {
      followUpQueued ||= followUp;
      return inflight;
    }

    inflight = (async () => {
      try {
        do {
          followUpQueued = false;
          await load();
        } while (followUpQueued);
      } finally {
        // Clear this before the promise settles. A follow-up action queued after
        // the loop's final check then starts its own load instead of attaching to
        // a completed promise.
        inflight = null;
      }
    })();

    return inflight;
  };
}

module.exports = { createRefreshQueue };
