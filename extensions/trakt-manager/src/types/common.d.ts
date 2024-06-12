declare type ArrayElementType<T extends unknown[]> = T extends (infer U)[] ? U : never;
