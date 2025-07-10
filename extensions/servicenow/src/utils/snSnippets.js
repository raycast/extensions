/**
 * CREDIT: Snippets taken from the SN utils / arnoudkooi
 */

export function findSysID(sys_id) {
  return `function findSysID(sys_id) {
    var commonTables = ["sys_metadata", "task", "cmdb_ci", "sys_user", "kb_knowledge"];
    var result;
    var i = 0;
    while (commonTables[i]) {
      result = findClass(commonTables[i], sys_id);
      i++;

      if (result) {
        gs.print("###" + result + "###");
        return;
      }
    }

    var forbiddenPrefixes = ["ts_", "sysx_", "v_", "sys_rollback_", "pa_"];
    var grDbObject = new GlideRecord("sys_db_object");
    grDbObject.addEncodedQuery(
      "super_class=NULL^sys_update_nameISNOTEMPTY^nameNOT LIKE00^nameNOT LIKE$^nameNOT INsys_metadata,task,cmdb_ci,sys_user,kb_knowledge,cmdb_ire_partial_payloads_index^scriptable_table=false^ORscriptable_tableISEMPTY",
    );
    grDbObject.query();
    while (grDbObject.next()) {
      var tableName = grDbObject.getValue("name");
      var hasForbiddenPrefix = forbiddenPrefixes.some(function (forbiddenPrefix) {
        return tableName.startsWith(forbiddenPrefix);
      });
      if (hasForbiddenPrefix) {
        continue;
      }
      result = findClass(tableName, sys_id);
      if (result) {
        gs.print("###" + result + "###");
        return;
      }
    }
    function findClass(table, sys_id) {
      try {
        var grTable = new GlideRecord(table);
        grTable.addQuery("sys_id", sys_id);
        // Order is important: setWorkflow must be before setLimit.
        grTable.setWorkflow(false);
        grTable.setLimit(1);
        grTable.queryNoDomain();
        grTable.query();
        if (grTable.hasNext()) {
          grTable.next();
          if (grTable.getUniqueValue() != sys_id) return false; //Some tables don't have sys_id
          return (
            grTable.getRecordClassName() + "^" + grTable.getClassDisplayValue() + " - " + grTable.getDisplayValue()
          );
        }
      } catch (err) {}
      return false;
    }
  }
  findSysID("${sys_id}");`;
}
