/**
  {
    "api":1,
    "name":"Sort JSON",
    "description":"Sort JSON",
    "author":"MaDnh",
    "icon":"sort-characters",
    "tags":"json,sort"
  }
**/

export function main(state) {
  let value = state.text;

  try {
    value = JSON.parse(value);
  } catch {
    state.postError("Invalid JSON");
    return;
  }

  value = sort(value);

  state.text = JSON.stringify(value, null, 2);
}

function sort(obj) {
  if (obj instanceof Array) {
    let out = obj.map((item) => sort(item));
    out.sort((a, b) => {
      let fa = JSON.stringify(a),
        fb = JSON.stringify(b);

      if (fa < fb) {
        return -1;
      }
      if (fa > fb) {
        return 1;
      }
      return 0;
    });
    return out;
  }

  if (!isPlainObject(obj)) {
    return obj;
  }

  const result = {};
  const keys = Object.keys(obj);

  keys.sort();
  keys.forEach((key) => {
    result[key] = sort(obj[key]);
  });

  return result;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
