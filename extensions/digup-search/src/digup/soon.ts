/**
 * Runs `task` on the next turn of the event loop, unless the returned function is called first.
 *
 * React runs an effect twice in development builds, cleaning the first run up at once, and an extension installed
 * from source stays a development build. Starting the helper "soon" means the run that's thrown away never starts
 * one: two helpers loading the model at the same moment made the one that stays several times slower.
 */
export function soon(task: () => void): () => void {
  const timer = setTimeout(task, 0);
  return () => clearTimeout(timer);
}
