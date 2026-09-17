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
        // A follow-up can land after the last `while` check but before we drop
        // `inflight`. Drain it here so callers awaiting this promise still see
        // the action's completed mutation.
        while (followUpQueued) {
          followUpQueued = false;
          await load();
        }
        inflight = null;
      }
    })();

    return inflight;
  };
}

module.exports = { createRefreshQueue };
