import { keyMap } from '../constants/keyMap';

export type Key = keyof typeof keyMap;
export type Modifier = 'command' | 'control' | 'shift' | 'option';
