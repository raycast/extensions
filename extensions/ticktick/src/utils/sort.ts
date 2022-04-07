import { ChecklistItem } from "../service/task";

function _compareDigit(d1: number, d2: number) {
  if (d1 === d2) {
    return 0;
  } else {
    return d1 > d2 ? 1 : -1;
  }
}

function _defined(d1: unknown, d2: unknown) {
  if (d1) {
    return d2 ? 0 : -1;
  } else {
    return d2 ? 1 : 0;
  }
}

function _compareId(id1: string, id2: string) {
  if (id1 == null && id2 == null) {
    return 0;
  }
  const ret = _defined(id1, id2);
  if (ret !== 0) {
    return ret;
  }
  if (id1) {
    return id1.localeCompare(id2);
  }
  return 1;
}

const sort = {
  checklist: (item1: ChecklistItem, item2: ChecklistItem) => {
    let ret = 0;

    ret = _compareDigit(item1.sortOrder, item2.sortOrder);
    if (ret !== 0) {
      return ret;
    }

    return _compareId(item1.id, item2.id);
  },
};

export default sort;
