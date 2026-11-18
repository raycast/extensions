import deckActions from '../api/deckActions';

export default async function tool() {
  const decks = await deckActions.getDecks();
  return decks.map(deck => ({
    deckId: deck.deck_id,
    name: deck.name,
    newCount: deck.new_count,
    learningCount: deck.learn_count,
    reviewCount: deck.review_count,
    totalCards: deck.total_in_deck,
  }));
}
