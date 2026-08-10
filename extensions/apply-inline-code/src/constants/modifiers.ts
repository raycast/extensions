import { Modifier } from '../types/key';

export const modifiers: Modifier[] = ['command', 'control', 'option', 'shift'];

export const modifierSymbolMap: Record<Modifier, string> = {
  command: '⌘',
  control: '⌃',
  option: '⌥',
  shift: '⇧',
};
