// Handle circular references in Jest
const originalStringify = JSON.stringify;
JSON.stringify = function (obj) {
  try {
    return originalStringify(obj);
  } catch (e) {
    if (e instanceof TypeError && e.message.includes('circular')) {
      return '[Circular]';
    }
    throw e;
  }
}; 