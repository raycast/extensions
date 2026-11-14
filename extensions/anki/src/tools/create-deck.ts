import { Tool } from '@raycast/api';
import deckActions from '../api/deckActions';
import { mutationResult } from './note-utils';

type Input = {
  /** Deck name. Use Parent::Child to create a nested deck. */
  name: string;
};

function deckName(input: Input) {
  if (typeof input.name !== 'string' || !input.name.trim()) throw new Error('Provide a deck name.');
  return input.name.trim();
}

export const confirmation: Tool.Confirmation<Input> = async input => ({
  message: 'Create this deck in Anki?',
  info: [{ name: 'Deck', value: deckName(input) }],
});

export default async function tool(input: Input) {
  const name = deckName(input);
  return mutationResult(async () => ({ deckId: await deckActions.createDeck(name), name }));
}
