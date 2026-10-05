import { Optional } from "@/common/utils/optional-utils";

export const toList = <T>(list: Optional<T[]>) => list ?? [];
export const rangeOf = (length: number) => Array.from({ length }, (_, index) => index);
export const isNotEmpty = <T>(list: Optional<T[]>) => toList(list).length > 0;
