import modelActions from '../api/modelActions';

export default async function tool() {
  const models = await modelActions.getModels();
  return (models ?? []).map(model => ({
    name: model.name,
    kind: model.type === 1 ? 'cloze' : 'standard',
    fields: [...model.flds]
      .sort((a, b) => a.ord - b.ord)
      .map(field => ({ name: field.name, description: field.description })),
    cardTemplates: [...model.tmpls].sort((a, b) => a.ord - b.ord).map(template => template.name),
  }));
}
