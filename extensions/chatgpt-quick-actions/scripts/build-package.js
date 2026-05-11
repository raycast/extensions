const fs = require('fs');
const path = require('path');
const { models, commandModels } = require('./models.js');

function generatePackageJson() {
  const templatePath = path.join(__dirname, '..', 'package.template.json');
  const outputPath = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(templatePath)) {
    console.error('package.template.json not found!');
    process.exit(1);
  }
  
  let template = fs.readFileSync(templatePath, 'utf8');
  
  const globalModelsJson = JSON.stringify(models, null, 8).replace(/^/gm, '        ').trim();
  const commandModelsJson = JSON.stringify(commandModels, null, 10).replace(/^/gm, '          ').trim();
  
  template = template.replace('{{GLOBAL_MODELS_LIST}}', globalModelsJson);
  template = template.replace(/{{COMMAND_MODELS_LIST}}/g, commandModelsJson);
  
  fs.writeFileSync(outputPath, template);
  console.log('✓ Generated package.json from template');
}

if (require.main === module) {
  generatePackageJson();
}

module.exports = { generatePackageJson }; 
